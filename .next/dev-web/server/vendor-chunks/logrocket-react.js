"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/logrocket-react";
exports.ids = ["vendor-chunks/logrocket-react"];
exports.modules = {

/***/ "(ssr)/./node_modules/logrocket-react/dist/index.js":
/*!****************************************************!*\
  !*** ./node_modules/logrocket-react/dist/index.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\nexports[\"default\"] = setupReact;\nfunction setupReact() {\n  const listener = event => {\n    try {\n      let fiberNode;\n      for (const key in event.target) {\n        if (key.startsWith('__reactFiber')) {\n          fiberNode = event.target[key];\n          break;\n        }\n      }\n      const names = [];\n      let currentElement = fiberNode;\n      while (currentElement) {\n        var name = typeof currentElement.elementType === 'function' && currentElement.elementType.displayName;\n        if (name) {\n          names.push(name);\n        }\n        currentElement = currentElement.return;\n      }\n      event.__lrName = names;\n    } catch (err) {\n      console.error('logrocket-react caught an error while hooking into React. Please make sure you are using the correct version of logrocket-react for your version of react.');\n    }\n  };\n  document.body.addEventListener('click', listener, {\n    capture: true,\n    passive: true\n  });\n}//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHNzcikvLi9ub2RlX21vZHVsZXMvbG9ncm9ja2V0LXJlYWN0L2Rpc3QvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQWE7O0FBRWIsOENBQTZDO0FBQzdDO0FBQ0EsQ0FBQyxFQUFDO0FBQ0Ysa0JBQWU7QUFDZjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSCIsInNvdXJjZXMiOlsiL1VzZXJzL3dhbmdoYWlsdW4vRG9jdW1lbnRzL015UHJvamVjdC9BSVRvb2xzL05ld1dlYi8wNTE5L3Jla2FjbGlwL25vZGVfbW9kdWxlcy9sb2dyb2NrZXQtcmVhY3QvZGlzdC9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJcInVzZSBzdHJpY3RcIjtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gIHZhbHVlOiB0cnVlXG59KTtcbmV4cG9ydHMuZGVmYXVsdCA9IHNldHVwUmVhY3Q7XG5mdW5jdGlvbiBzZXR1cFJlYWN0KCkge1xuICBjb25zdCBsaXN0ZW5lciA9IGV2ZW50ID0+IHtcbiAgICB0cnkge1xuICAgICAgbGV0IGZpYmVyTm9kZTtcbiAgICAgIGZvciAoY29uc3Qga2V5IGluIGV2ZW50LnRhcmdldCkge1xuICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ19fcmVhY3RGaWJlcicpKSB7XG4gICAgICAgICAgZmliZXJOb2RlID0gZXZlbnQudGFyZ2V0W2tleV07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IG5hbWVzID0gW107XG4gICAgICBsZXQgY3VycmVudEVsZW1lbnQgPSBmaWJlck5vZGU7XG4gICAgICB3aGlsZSAoY3VycmVudEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIG5hbWUgPSB0eXBlb2YgY3VycmVudEVsZW1lbnQuZWxlbWVudFR5cGUgPT09ICdmdW5jdGlvbicgJiYgY3VycmVudEVsZW1lbnQuZWxlbWVudFR5cGUuZGlzcGxheU5hbWU7XG4gICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgbmFtZXMucHVzaChuYW1lKTtcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50RWxlbWVudCA9IGN1cnJlbnRFbGVtZW50LnJldHVybjtcbiAgICAgIH1cbiAgICAgIGV2ZW50Ll9fbHJOYW1lID0gbmFtZXM7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdsb2dyb2NrZXQtcmVhY3QgY2F1Z2h0IGFuIGVycm9yIHdoaWxlIGhvb2tpbmcgaW50byBSZWFjdC4gUGxlYXNlIG1ha2Ugc3VyZSB5b3UgYXJlIHVzaW5nIHRoZSBjb3JyZWN0IHZlcnNpb24gb2YgbG9ncm9ja2V0LXJlYWN0IGZvciB5b3VyIHZlcnNpb24gb2YgcmVhY3QuJyk7XG4gICAgfVxuICB9O1xuICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbGlzdGVuZXIsIHtcbiAgICBjYXB0dXJlOiB0cnVlLFxuICAgIHBhc3NpdmU6IHRydWVcbiAgfSk7XG59Il0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6WzBdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(ssr)/./node_modules/logrocket-react/dist/index.js\n");

/***/ })

};
;