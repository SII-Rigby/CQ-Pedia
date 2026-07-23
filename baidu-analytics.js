// Baidu Analytics: only load on production domains to avoid local test traffic.
if (
  location.hostname === "cqpedia.cn" ||
  location.hostname === "www.cqpedia.cn"
) {
  window._hmt = window._hmt || [];

  (function () {
    var hm = document.createElement("script");
    hm.src = "https://hm.baidu.com/hm.js?ff0cb9d634de0b737a9bb353ade0e74a";

    var firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(hm, firstScript);
  })();
}
