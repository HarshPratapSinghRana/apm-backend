export type GlobalSearchTarget =
  | {
      type: "productDetail";
      productId: string;
    }
  | {
      type: "industryUseCase";
      domainId: string;
      useCaseId: string;
    }
  | {
      type: "externalUrl";
      url: string;
    };

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  group: "Products" | "Industry Use Cases" | "Case Studies" | "Other";
  target: GlobalSearchTarget;
}

