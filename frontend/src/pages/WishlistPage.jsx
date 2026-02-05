import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Wishlist feature removed — redirect users to My TBR page
export default function WishlistPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/mytbr', { replace: true }); }, [navigate]);
  return null;
}