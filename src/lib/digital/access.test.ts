import { describe, expect, it } from "vitest";
import { buildGoogleDriveFolderAccessUrl } from "./access";

describe("buildGoogleDriveFolderAccessUrl", () => {
  it("no expone en catálogo — solo construye URL server-side", () => {
    const url = buildGoogleDriveFolderAccessUrl("abc123XYZ");
    expect(url).toBe("https://drive.google.com/drive/folders/abc123XYZ");
  });
});
