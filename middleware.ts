import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Public routes
        if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
          return true;
        }
        
        // Protected routes require token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    '/((?!api/auth|api/signup|_next/static|_next/image|favicon.ico|og-image.png|robots.txt).*)',
  ],
};
