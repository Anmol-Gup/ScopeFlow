import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Starts undefined on both server and client so the first client render
  // matches SSR output exactly — resolving the real value only after mount
  // (in the effect) avoids a hydration mismatch, trading it for a one-time
  // layout settle right after mount instead.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
