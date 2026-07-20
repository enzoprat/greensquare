'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface CartLineView {
  productId: string; handle: string; title: string; brandSlug: string; brandName: string;
  sku: string | null; imageUrl: string | null; caseQuantity: number; unitsPerCase: number;
  totalUnits: number; casesPerPallet: number | null; fullPallets: number; remainingCases: number;
  displayCasePrice: string; displayLineTotal: string; lineTotalHtCents: number | null;
}
export interface CartView {
  lineCount: number; totalCases: number;
  byBrand: { brandSlug: string; brandName: string; lines: CartLineView[] }[];
  canSeePrice: boolean; subtotalHtCents: number | null; displaySubtotal: string;
  minimum: { minimumHtCents: number; remainingHtCents: number | null; progressRatio: number; reached: boolean; displayRemaining: string };
  checkoutAllowed: boolean; blockReason: string | null;
}

type Ctx = {
  cart: CartView | null;
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  mutate: (op: 'add' | 'set' | 'remove', productId: string, cases?: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/cart', { cache: 'no-store' });
    if (res.ok) setCart(await res.json());
  }, []);

  const mutate = useCallback(async (op: 'add' | 'set' | 'remove', productId: string, cases?: number) => {
    if (inflight.current) return; // guard against double-click race
    inflight.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, productId, cases }),
      });
      if (res.ok) setCart(await res.json());
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  // Re-sync when the tab regains focus (multi-tab consistency, section 15).
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return (
    <CartContext.Provider value={{ cart, loading, open, setOpen, mutate, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): Ctx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
