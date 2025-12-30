import { onRequestGet as __api_analyze_js_onRequestGet } from "C:\\Users\\larau\\Documents\\Coding\\Autobex 2\\functions\\api\\analyze.js"
import { onRequestGet as __api_search_js_onRequestGet } from "C:\\Users\\larau\\Documents\\Coding\\Autobex 2\\functions\\api\\search.js"

export const routes = [
    {
      routePath: "/api/analyze",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_analyze_js_onRequestGet],
    },
  {
      routePath: "/api/search",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_search_js_onRequestGet],
    },
  ]