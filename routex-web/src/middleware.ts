import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',        // covers /login/[[...rest]] catch-all
  '/register(.*)',     // covers /register/[[...rest]] catch-all
  '/api/webhooks(.*)', // Clerk webhooks
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all routes that are not public
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
