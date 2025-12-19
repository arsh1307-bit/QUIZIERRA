
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from './lib/types'; // Assuming UserRole is exported from here

// 1. Specify protected routes
const teacherRoutes = ['/quiz/generate', '/quiz/review'];
const studentRoutes = ['/quiz/attempt'];

export function middleware(request: NextRequest) {
  // 2. Check for a session cookie
  const session = request.cookies.get('session');

  // 3. Redirect to login if no session
  if (!session) {
    if (teacherRoutes.some(path => request.nextUrl.pathname.startsWith(path)) || studentRoutes.some(path => request.nextUrl.pathname.startsWith(path))) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 4. Decode the session token (replace with your actual decoding logic)
  let user: { role: UserRole } | null = null;
  try {
    // In a real app, you would verify and decode a JWT here
    // For this example, we'll simulate it based on a simple cookie value
    if (session.value) {
        const decoded = JSON.parse(Buffer.from(session.value, 'base64').toString());
        user = { role: decoded.role };
    }
  } catch (error) {
    console.error('Invalid session token:', error);
    // Handle invalid token, maybe redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 5. Redirect based on role
  if (user) {
    const { role } = user;
    const currentPath = request.nextUrl.pathname;

    if (teacherRoutes.some(path => currentPath.startsWith(path)) && role !== 'instructor') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    if (studentRoutes.some(path => currentPath.startsWith(path)) && role !== 'student') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // 6. Continue to the requested page
  return NextResponse.next();
}

export const config = {
  matcher: ['/quiz/generate/:path*', '/quiz/review/:path*', '/quiz/attempt/:path*'],
};
