import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useTour } from "../context/TourContext";
import Button from "./Button";

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 320;
const GAP = 16;

function useTargetRect(selector) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }

    let raf;
    let attempts = 0;

    // A step change usually just changed route too, so the target may
    // not have mounted yet on the very next paint — poll a few frames
    // instead of assuming it's already there.
    const measure = () => {
      const el = document.querySelector(selector);

      if (el) {
        setRect(el.getBoundingClientRect());
        return;
      }

      attempts += 1;
      if (attempts < 60) {
        raf = requestAnimationFrame(measure);
      }
    };

    measure();

    const handleReflow = () => {
      const el = document.querySelector(selector);
      if (el) setRect(el.getBoundingClientRect());
    };

    window.addEventListener("resize", handleReflow);
    window.addEventListener("scroll", handleReflow, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleReflow);
      window.removeEventListener("scroll", handleReflow, true);
    };
  }, [selector]);

  return rect;
}

function tooltipPosition(rect, placement, tooltipHeight) {
  if (!rect) {
    return {
      top: window.innerHeight / 2 - tooltipHeight / 2,
      left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2,
    };
  }

  let top;
  let left;

  if (placement === "right") {
    top = rect.top;
    left = rect.right + GAP;
  } else if (placement === "top") {
    top = rect.top - GAP - tooltipHeight;
    left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
  } else if (placement === "bottom") {
    top = rect.bottom + GAP;
    left = rect.left;
  } else {
    top = rect.top;
    left = rect.right + GAP;
  }

  left = Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 12));
  top = Math.max(12, Math.min(top, window.innerHeight - tooltipHeight - 12));

  return { top, left };
}

export default function TourOverlay() {
  const { isActive, step, stepIndex, totalSteps, next, back, end } = useTour();
  const rect = useTargetRect(step?.selector);
  const tooltipRef = useRef(null);
  const [tooltipHeight, setTooltipHeight] = useState(160);

  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight);
    }
  }, [step, rect]);

  if (!isActive || !step) return null;

  const placement = step.placement === "top" ? "top" : step.placement;
  const { top, left } = tooltipPosition(rect, placement, tooltipHeight);

  const isLast = stepIndex === totalSteps - 1;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl border-2 border-accent transition-all duration-200"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(12, 14, 13, 0.68)",
          }}
        />
      ) : (
        <div
          className="fixed inset-0"
          style={{ backgroundColor: "rgba(12, 14, 13, 0.68)" }}
        />
      )}

      <div
        ref={tooltipRef}
        className="fixed rounded-xl border border-border bg-surface p-4 shadow-[0_18px_50px_rgba(12,14,13,0.35)] transition-all duration-200"
        style={{ top, left, width: TOOLTIP_WIDTH }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={15} strokeWidth={1.8} className="text-accent" />
            <h3 className="text-sm font-semibold text-primary">{step.title}</h3>
          </div>

          <button
            type="button"
            onClick={() => end()}
            aria-label="Close tour"
            className="shrink-0 rounded-md p-1 text-faint transition-colors hover:bg-surface-hover hover:text-primary"
          >
            <X size={15} />
          </button>
        </div>

        <p className="mt-2 text-sm leading-6 text-secondary">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[10px] text-faint">
            {stepIndex + 1} / {totalSteps}
          </span>

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={back}>
                Back
              </Button>
            )}

            <Button
              variant="accent"
              size="sm"
              icon={isLast ? undefined : ArrowRight}
              onClick={next}
            >
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
