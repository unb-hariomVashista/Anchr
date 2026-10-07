import { useEffect } from "react";

/**
 * Custom hook that triggers a callback when a click or tap occurs outside of the referenced element.
 * Automatically closes open dropdowns/popovers when clicking outside or clicking any other interactive element.
 *
 * @param {React.RefObject} ref - React ref attached to the dropdown wrapper element.
 * @param {Function} handler - Function to invoke when a click outside occurs (e.g. () => setOpen(false)).
 * @param {boolean} [enabled=true] - Whether the click-outside listener should be active.
 */
export function useClickOutside(ref, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event) => {
      // Do nothing if clicking the ref's element or any of its children
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener("pointerdown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("pointerdown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, enabled]);
}
