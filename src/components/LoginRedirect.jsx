import { Navigate, useLocation } from "react-router-dom";

// Sends a signed-out visitor of a staff page to the sign-in screen, carrying
// the page they asked for so sign-in returns them there (validated by
// safeReturnTo on the login page — same-origin paths only).
export default function LoginRedirect() {
  const { pathname, search } = useLocation();
  const returnTo = encodeURIComponent(pathname + search);
  return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
}