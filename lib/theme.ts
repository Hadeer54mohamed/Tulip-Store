export const THEME_KEY = "tulip-theme"

/** Runs in <head> before first paint so a page never flashes the wrong theme. One key shared by shop and admin. */
export const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}")||localStorage.getItem("tulip-admin-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`
