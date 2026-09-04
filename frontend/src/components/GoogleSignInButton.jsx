import { useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleSignInButton({ onCredential, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onCredential(response.credential),
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 328,
        text: "continue_with",
      });
    };

    if (window.google?.accounts?.id) {
      render();
    } else {
      // The GIS script (loaded in index.html) may not have finished
      // loading yet on a fast first paint — poll briefly rather than
      // wiring up a load-event listener for a script tag we don't own
      // a reference to here.
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          render();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(interval);
        if (!window.google?.accounts?.id) {
          onError?.("Could not load Google Sign-In.");
        }
      }, 8000);

      return () => clearInterval(interval);
    }

    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!CLIENT_ID) return null;

  return <div ref={buttonRef} className="flex justify-center" />;
}
