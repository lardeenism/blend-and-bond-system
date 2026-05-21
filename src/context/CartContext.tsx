import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface CartItem {
  id: number;
  name: string;
  price: number;
  image_filename: string;
  category_name: string;
  quantity: number;
  size_label?: string;
  volume_ml?: number;
  stock_limit?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Omit<CartItem, 'quantity'>, quantity: number) => void;
  removeFromCart: (id: number, size_label?: string) => void;
  updateQuantity: (id: number, quantity: number, size_label?: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
  getReservedQuantity: (id: number) => number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('bb-cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('bb-cart', JSON.stringify(items));
  }, [items]);



  const getReservedQuantity = (id: number) => {
    return items.filter(item => item.id === id).reduce((sum, item) => sum + item.quantity, 0);
  };

  const addToCart = (product: Omit<CartItem, 'quantity'>, quantity: number) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id && i.size_label === product.size_label);
      const stockLimit = product.stock_limit ?? existing?.stock_limit;
      const reservedForProduct = prev.filter(item => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
      const availableForProduct = stockLimit != null ? Math.max(0, stockLimit - reservedForProduct) : quantity;
      const quantityToAdd = stockLimit != null ? Math.min(quantity, availableForProduct) : quantity;

      if (quantityToAdd <= 0) return prev;

      if (existing) {
        return prev.map(i =>
          i.id === product.id && i.size_label === product.size_label
            ? { ...i, quantity: i.quantity + quantityToAdd, stock_limit: stockLimit ?? i.stock_limit }
            : i
        );
      }
      return [...prev, { ...product, quantity: quantityToAdd, stock_limit: stockLimit }];
    });
  };

  const removeFromCart = (id: number, size_label?: string) => {
    setItems(prev => prev.filter(i => !(i.id === id && i.size_label === size_label)));
  };

  const updateQuantity = (id: number, quantity: number, size_label?: string) => {
    if (quantity <= 0) {
      removeFromCart(id, size_label);
      return;
    }
    setItems(prev => {
      const existing = prev.find(i => i.id === id && i.size_label === size_label);
      if (!existing) return prev;
      const stockLimit = existing.stock_limit;
      const reservedOtherSizes = prev.filter(item => item.id === id && item.size_label !== size_label).reduce((sum, item) => sum + item.quantity, 0);
      const maxAllowed = stockLimit != null ? Math.max(0, stockLimit - reservedOtherSizes) : quantity;
      const safeQuantity = Math.min(quantity, maxAllowed);

      return prev.map(i =>
        i.id === id && i.size_label === size_label ? { ...i, quantity: safeQuantity } : i
      );
    });
  };

  const clearCart = () => setItems([]);

  const getSubtotal = () => items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const getItemCount = () => items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, getSubtotal, getItemCount, getReservedQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
