/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/google-one-tap";
exports.ids = ["vendor-chunks/google-one-tap"];
exports.modules = {

/***/ "(ssr)/./node_modules/google-one-tap/index.js":
/*!**********************************************!*\
  !*** ./node_modules/google-one-tap/index.js ***!
  \**********************************************/
/***/ ((module) => {

eval("function googleOneTap(\n  {\n    client_id,\n    auto_select = false,\n    cancel_on_tap_outside = false,\n    context = \"signin\",\n    ...otherOptions\n  },\n  callback\n) {\n  if (!client_id) {\n    throw new Error(\"client_id is required\");\n  }\n\n  if (typeof window !== \"undefined\" && window.document) {\n    const contextValue = [\"signin\", \"signup\", \"use\"].includes(context)\n      ? context\n      : \"signin\";\n    const googleScript = document.createElement(\"script\");\n    googleScript.src = \"https://accounts.google.com/gsi/client\";\n    googleScript.async = true;\n    googleScript.defer = true;\n    document.head.appendChild(googleScript);\n    window.onload = function () {\n      window.google.accounts.id.initialize({\n        client_id: client_id,\n        callback: callback,\n        auto_select: auto_select,\n        cancel_on_tap_outside: cancel_on_tap_outside,\n        context: contextValue,\n        ...otherOptions,\n      });\n      window.google.accounts.id.prompt();\n    };\n  }\n}\n\nmodule.exports = googleOneTap;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvZ29vZ2xlLW9uZS10YXAvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHO0FBQ0g7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsT0FBTztBQUNQO0FBQ0E7QUFDQTtBQUNBOztBQUVBIiwic291cmNlcyI6WyIvVXNlcnMvd2FuZ2hhaWx1bi9Eb2N1bWVudHMvTXlQcm9qZWN0L0FJVG9vbHMvTmV3V2ViLzA1MTkvcmVrYWNsaXAvbm9kZV9tb2R1bGVzL2dvb2dsZS1vbmUtdGFwL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIGdvb2dsZU9uZVRhcChcbiAge1xuICAgIGNsaWVudF9pZCxcbiAgICBhdXRvX3NlbGVjdCA9IGZhbHNlLFxuICAgIGNhbmNlbF9vbl90YXBfb3V0c2lkZSA9IGZhbHNlLFxuICAgIGNvbnRleHQgPSBcInNpZ25pblwiLFxuICAgIC4uLm90aGVyT3B0aW9uc1xuICB9LFxuICBjYWxsYmFja1xuKSB7XG4gIGlmICghY2xpZW50X2lkKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiY2xpZW50X2lkIGlzIHJlcXVpcmVkXCIpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmRvY3VtZW50KSB7XG4gICAgY29uc3QgY29udGV4dFZhbHVlID0gW1wic2lnbmluXCIsIFwic2lnbnVwXCIsIFwidXNlXCJdLmluY2x1ZGVzKGNvbnRleHQpXG4gICAgICA/IGNvbnRleHRcbiAgICAgIDogXCJzaWduaW5cIjtcbiAgICBjb25zdCBnb29nbGVTY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgIGdvb2dsZVNjcmlwdC5zcmMgPSBcImh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9nc2kvY2xpZW50XCI7XG4gICAgZ29vZ2xlU2NyaXB0LmFzeW5jID0gdHJ1ZTtcbiAgICBnb29nbGVTY3JpcHQuZGVmZXIgPSB0cnVlO1xuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoZ29vZ2xlU2NyaXB0KTtcbiAgICB3aW5kb3cub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgd2luZG93Lmdvb2dsZS5hY2NvdW50cy5pZC5pbml0aWFsaXplKHtcbiAgICAgICAgY2xpZW50X2lkOiBjbGllbnRfaWQsXG4gICAgICAgIGNhbGxiYWNrOiBjYWxsYmFjayxcbiAgICAgICAgYXV0b19zZWxlY3Q6IGF1dG9fc2VsZWN0LFxuICAgICAgICBjYW5jZWxfb25fdGFwX291dHNpZGU6IGNhbmNlbF9vbl90YXBfb3V0c2lkZSxcbiAgICAgICAgY29udGV4dDogY29udGV4dFZhbHVlLFxuICAgICAgICAuLi5vdGhlck9wdGlvbnMsXG4gICAgICB9KTtcbiAgICAgIHdpbmRvdy5nb29nbGUuYWNjb3VudHMuaWQucHJvbXB0KCk7XG4gICAgfTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdvb2dsZU9uZVRhcDtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/google-one-tap/index.js\n");

/***/ })

};
;