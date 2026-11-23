import { normArea } from "@/lib/areas";
import { it, expect } from "vitest";
it("areas", () => { expect(["KANAAP","KNAPP 1","KANAPP 2","Knapp  1 ","MEZAMINE 1","ESTANTERIA 2","KNAPP"].map(normArea)).toEqual(["KNAPP","KNAPP 1","KNAPP 2","KNAPP 1","MEZZANINE 1","ESTANTERIA 2","KNAPP"]); });
