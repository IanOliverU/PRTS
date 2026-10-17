import { describe, expect, it } from "vitest";

import {
  MARKETPLACE_REPO_SLUG,
  MARKETPLACE_REPO_URL,
  MCP_TOOLS_SERVER_NAMES,
  OFFICIAL_REPO_LABEL,
  OFFICIAL_REPO_SLUG,
  OFFICIAL_REPO_URL,
  PRODUCT_NAME,
  PROJECT_REPO_SLUG,
  PROJECT_REPO_URL,
  PROJECT_REPO_LABEL,
  UPSTREAM_REPO_URL,
} from "@/lib/branding";

describe("branding", () => {
  it("shows the product display name", () => {
    expect(PRODUCT_NAME).toBe("PRTS");
  });

  it("links project documentation and sharing to the fork while retaining upstream credit", () => {
    expect(PROJECT_REPO_SLUG).toBe("IanOliverU/PRTS");
    expect(PROJECT_REPO_URL).toBe("https://github.com/IanOliverU/PRTS");
    expect(PROJECT_REPO_LABEL).toBe("github.com/IanOliverU/PRTS");
    expect(UPSTREAM_REPO_URL).toBe("https://github.com/Dodaios/Dodaios");
    expect(PROJECT_REPO_URL).not.toBe(OFFICIAL_REPO_URL);
  });

  it("keeps the existing updater repository independent of display links", () => {
    expect(OFFICIAL_REPO_SLUG).toBe("Dodaios/Dodaios");
    expect(OFFICIAL_REPO_URL).toBe("https://github.com/Dodaios/Dodaios");
    expect(OFFICIAL_REPO_LABEL).toBe("github.com/Dodaios/Dodaios");
  });

  it("links to the community registry", () => {
    expect(MARKETPLACE_REPO_SLUG).toBe("Dodaios/marketplace");
    expect(MARKETPLACE_REPO_URL).toBe("https://github.com/Dodaios/marketplace");
  });

  it("names the MCP tools server, the current name first and the earlier one kept", () => {
    expect(MCP_TOOLS_SERVER_NAMES).toEqual(["dodaios", "jarvis"]);
  });
});
