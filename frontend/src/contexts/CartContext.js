import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rs_cart') || '[]'); }
    catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('rs_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item) => {
    // item: { id, type, beat_id/plan_id, license_type, price, title, cover_url, producer_name, ... }
    setItems(prev => {
      const key = item.type === 'beat' ? `${item.id}-${item.license_type}` : item.id;
      const exists = prev.find(i => (i.type === 'beat' ? `${i.id}-${i.license_type}` : i.id) === key);
      if (exists) {
        setIsOpen(true);
        return prev;
      }
      setIsOpen(true);
      return [...prev, { ...item, cart_key: key }];
    });
  };

  const removeItem = (cartKey) => {
    setItems(prev => prev.filter(i => i.cart_key !== cartKey));
  };

  const clearCart = () => setItems([]);

  const isInCart = (id, licenseType = null) => {
    const key = licenseType ? `${id}-${licenseType}` : id;
    return items.some(i => i.cart_key === key);
  };

  const total = items.reduce((acc, i) => acc + (i.price || 0), 0);
  const count = items.length;

  return (
    <CartContext.Provider value={{ items, isOpen, setIsOpen, addItem, removeItem, clearCart, isInCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export default CartContext;
