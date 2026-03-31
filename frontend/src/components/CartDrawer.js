import React from 'react';
import { useCart } from '@/contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Trash2, Package, Music2 } from 'lucide-react';

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, removeItem, clearCart, total } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 w-full max-w-sm bg-[#141416] border-l border-white/10 flex flex-col shadow-2xl"
        style={{ animation: 'slide-in-right 0.2s ease-out' }}
        data-testid="cart-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#8b5cf6]" />
            <p className="font-semibold text-white">Sepetim</p>
            <span className="w-5 h-5 rounded-full bg-[#8b5cf6] text-white text-xs flex items-center justify-center font-bold">{items.length}</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-[#a1a1aa] hover:text-white transition-colors" data-testid="cart-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={40} className="text-[#a1a1aa] mx-auto mb-4 opacity-20" />
              <p className="text-[#a1a1aa] text-sm">Sepetiniz boş.</p>
              <button onClick={() => { setIsOpen(false); navigate('/beats'); }} className="mt-3 text-xs text-[#8b5cf6] hover:text-[#7c3aed] transition-colors">
                Beat'lere Göz At →
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.cart_key} className="flex items-center gap-3 p-3 bg-[#0d0d0f] rounded-md border border-white/5">
                {item.cover_url ? (
                  <img src={item.cover_url} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#8b5cf6]/20 flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-[#8b5cf6]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-[#a1a1aa]">{item.producer_name || ''}</p>
                  {item.license_type && (
                    <span className="badge-genre text-[10px] capitalize mt-0.5 inline-block">{item.license_type} lisans</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-[#10b981]">₺{item.price}</span>
                  <button onClick={() => removeItem(item.cart_key)} className="text-[#a1a1aa] hover:text-[#ec4899] transition-colors" data-testid={`cart-remove-${item.id}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-5 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#a1a1aa]">Toplam</span>
              <span className="text-xl font-bold text-white">₺{total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => { setIsOpen(false); navigate('/checkout'); }}
              className="w-full bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-semibold py-3 rounded-md transition-all hover:shadow-glow flex items-center justify-center gap-2"
              data-testid="checkout-btn"
            >
              <ShoppingBag size={16} /> Ödeme Sayfasına Git
            </button>
            <button onClick={clearCart} className="w-full text-xs text-[#a1a1aa] hover:text-[#ec4899] transition-colors py-1">
              Sepeti Temizle
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default CartDrawer;
