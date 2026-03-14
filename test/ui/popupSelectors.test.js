import test from "node:test";
import assert from "node:assert/strict";

import {
  formatSocialHandle,
  normalizeSocialHandle,
} from "../../src/ui/selectors/popupSelectors.js";

test("popup social selectors treat legacy other like website", () => {
  assert.equal(
    normalizeSocialHandle("other", "https://www.example.com/Path/"),
    "example.com/path",
  );
  assert.equal(
    formatSocialHandle({ platform: "other", handle: "https://www.example.com/Path/" }),
    "www.example.com/Path",
  );
});
