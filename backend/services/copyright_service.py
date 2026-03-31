"""
Copyright Fingerprinting Architecture
Designed to integrate with ACRCloud, Audible Magic, or similar audio fingerprinting APIs.

Usage:
  1. Set ACRCLOUD_API_KEY + ACRCLOUD_HOST in .env to activate real checking.
  2. Without keys, runs in mock mode (always returns CLEAR).
  3. The service interface is stable — swap providers without changing calling code.

Production Setup:
  ACRCLOUD_API_KEY=your_key
  ACRCLOUD_HOST=identify-eu-west-1.acrcloud.com
  ACRCLOUD_ACCESS_SECRET=your_secret
"""
import os
import hashlib
import hmac
import base64
import time
import logging
import asyncio
from typing import Optional

logger = logging.getLogger(__name__)


class CopyrightCheckResult:
    def __init__(self, status: str, confidence: float = 0.0,
                 matched_track: Optional[str] = None, matched_artist: Optional[str] = None,
                 provider: str = "mock", message: str = ""):
        self.status = status              # CLEAR | MATCH | PARTIAL_MATCH | ERROR | SKIP
        self.confidence = confidence      # 0-100
        self.matched_track = matched_track
        self.matched_artist = matched_artist
        self.provider = provider
        self.message = message

    def to_dict(self) -> dict:
        return {
            "status": self.status,
            "confidence": self.confidence,
            "matched_track": self.matched_track,
            "matched_artist": self.matched_artist,
            "provider": self.provider,
            "message": self.message,
            "is_clear": self.status == "CLEAR",
            "action_required": self.status in ("MATCH", "PARTIAL_MATCH"),
        }


class CopyrightCheckService:
    """
    Audio fingerprinting service wrapper.
    Supports: ACRCloud (primary), mock (fallback).
    """

    def __init__(self):
        self.api_key = os.environ.get("ACRCLOUD_API_KEY", "")
        self.api_secret = os.environ.get("ACRCLOUD_ACCESS_SECRET", "")
        self.api_host = os.environ.get("ACRCLOUD_HOST", "identify-eu-west-1.acrcloud.com")
        self.provider = "acrcloud" if (self.api_key and self.api_secret) else "mock"
        if self.provider == "mock":
            logger.info("CopyrightCheckService: running in MOCK mode. Set ACRCLOUD_API_KEY to activate.")

    async def check_audio_file(self, audio_data: bytes, filename: str = "audio.mp3") -> CopyrightCheckResult:
        """
        Check audio file for copyright matches.
        Args:
            audio_data: Raw audio bytes
            filename: Original filename for logging
        Returns:
            CopyrightCheckResult
        """
        if self.provider == "acrcloud":
            return await self._check_acrcloud(audio_data, filename)
        return self._mock_check(filename)

    async def check_audio_url(self, url: str) -> CopyrightCheckResult:
        """Check audio from URL (downloads first 30s for fingerprinting)."""
        if self.provider == "acrcloud":
            try:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, timeout=30) as resp:
                        if resp.status == 200:
                            data = await resp.read()
                            return await self._check_acrcloud(data[:1024 * 1024], url.split('/')[-1])
            except Exception as e:
                logger.error(f"Copyright URL check failed: {e}")
                return CopyrightCheckResult("ERROR", message=str(e), provider="acrcloud")
        return self._mock_check(url)

    def _mock_check(self, identifier: str = "") -> CopyrightCheckResult:
        """Mock check — always returns CLEAR."""
        return CopyrightCheckResult(
            status="CLEAR",
            confidence=0.0,
            provider="mock",
            message=(
                "Copyright check passed (mock mode). "
                "Set ACRCLOUD_API_KEY and ACRCLOUD_ACCESS_SECRET to enable real fingerprinting. "
                f"File: {identifier}"
            )
        )

    async def _check_acrcloud(self, audio_data: bytes, filename: str) -> CopyrightCheckResult:
        """
        Real ACRCloud API integration.
        Documentation: https://docs.acrcloud.com/reference/identification-api
        """
        try:
            import aiohttp

            timestamp = str(int(time.time()))
            string_to_sign = "\n".join([
                "POST",
                "/v1/identify",
                self.api_key,
                "audio",
                "1",
                timestamp
            ])
            sign = base64.b64encode(
                hmac.new(
                    self.api_secret.encode('utf-8'),
                    string_to_sign.encode('utf-8'),
                    hashlib.sha1
                ).digest()
            ).decode('utf-8')

            data = aiohttp.FormData()
            data.add_field('sample', audio_data, filename=filename, content_type='audio/mpeg')
            data.add_field('access_key', self.api_key)
            data.add_field('data_type', 'audio')
            data.add_field('signature_version', '1')
            data.add_field('signature', sign)
            data.add_field('sample_bytes', str(len(audio_data)))
            data.add_field('timestamp', timestamp)

            async with aiohttp.ClientSession() as session:
                url = f"https://{self.api_host}/v1/identify"
                async with session.post(url, data=data, timeout=30) as resp:
                    result = await resp.json()

            status_code = result.get("status", {}).get("code", -1)
            status_msg = result.get("status", {}).get("msg", "")

            if status_code == 0:  # Found match
                music = result.get("metadata", {}).get("music", [{}])[0]
                return CopyrightCheckResult(
                    status="MATCH",
                    confidence=float(music.get("score", 0)),
                    matched_track=music.get("title", "Unknown"),
                    matched_artist=music.get("artists", [{}])[0].get("name", "Unknown"),
                    provider="acrcloud",
                    message=f"Copyright match detected: {music.get('title')} by {music.get('artists', [{}])[0].get('name')}"
                )
            elif status_code == 1001:  # No result
                return CopyrightCheckResult(
                    status="CLEAR",
                    confidence=0.0,
                    provider="acrcloud",
                    message="No copyright match found."
                )
            else:
                return CopyrightCheckResult(
                    status="ERROR",
                    provider="acrcloud",
                    message=f"ACRCloud error: {status_msg}"
                )

        except Exception as e:
            logger.error(f"ACRCloud check failed: {e}")
            return CopyrightCheckResult("ERROR", message=str(e), provider="acrcloud")


# Module-level singleton
_copyright_service: Optional[CopyrightCheckService] = None

def get_copyright_service() -> CopyrightCheckService:
    global _copyright_service
    if _copyright_service is None:
        _copyright_service = CopyrightCheckService()
    return _copyright_service
