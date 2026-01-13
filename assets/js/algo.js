(() => {
  const docsearchFn = window.docsearch;
  if (typeof docsearchFn !== "function") {
    // DocSearch UMD script not loaded.
    return;
  }

  // DocSearch can sometimes leave the "kbd pressed" visual state stuck
  // (e.g. ⌘ / Ctrl keycap shows as pressed) if the corresponding keyup event
  // is missed due to focus changes. We defensively clear it on common lifecycle
  // events (keyup, window blur, tab hidden, modal open).
  const clearPressedKeycaps = () => {
    document
      .querySelectorAll(".DocSearch-Button-Key--pressed")
      .forEach((el) => el.classList.remove("DocSearch-Button-Key--pressed"));
  };

  window.addEventListener("blur", clearPressedKeycaps, { passive: true });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) clearPressedKeycaps();
    },
    { passive: true }
  );
  document.addEventListener(
    "keyup",
    (e) => {
      // Only needed for modifier keys, but clearing is cheap and avoids edge cases.
      if (
        e.key === "Meta" ||
        e.key === "Control" ||
        e.key === "Alt" ||
        e.key === "Shift"
      ) {
        clearPressedKeycaps();
      }
    },
    { passive: true }
  );

  const rewriteToLocalIfFileProtocol = (itemUrl) => {
    if (window.location.protocol !== "file:" || typeof itemUrl !== "string") {
      return itemUrl;
    }

    const localBase = window.location.href
      .split("#")[0]
      .split("?")[0]
      .replace(/\/[^/]*$/, "");

    const remoteBase = itemUrl
      .split("#")[0]
      .split("?")[0]
      .replace(/\/[^/]*$/, "");

    if (!localBase || !remoteBase) return itemUrl;
    return itemUrl.replace(remoteBase, localBase);
  };

  docsearchFn({
    appId: "7KP0FJOR6F",
    apiKey: "c30c21b1f89a0e2d5b44df1be7401072",
    indexName: "lex0-crawler",
    container: "#docsearch",
    transformItems(items) {
      if (items && items.length) console.log(items[0]);
      return (items || []).map((item) => {
        if (!item || typeof item.url !== "string") return item;
        return { ...item, url: rewriteToLocalIfFileProtocol(item.url) };
      });
    },
    navigator: {
      navigate({ itemUrl }) {
        window.location.assign(rewriteToLocalIfFileProtocol(itemUrl));
      },
    },
  });

  // Ensure the modal input is focusable/typed into immediately when opened.
  const focusDocSearchInput = () => {
    const input = document.querySelector(".DocSearch-Input");
    if (input && typeof input.focus === "function") input.focus();
  };

  const body = document.body;
  if (body) {
    const observer = new MutationObserver(() => {
      if (body.classList.contains("DocSearch--active")) {
        clearPressedKeycaps();
        setTimeout(focusDocSearchInput, 0);
        setTimeout(focusDocSearchInput, 50);
      }
    });
    observer.observe(body, { attributes: true, attributeFilter: ["class"] });
  }
})();
