/**
 * There are no in-app purchases on the web build, which exists only to preview
 * the interface. Everything here reports honestly rather than pretending.
 */

export type PurchasesPackage = {
  identifier: string;
  product: { identifier: string; priceString: string; title: string };
};

export function isConfigured(): boolean {
  return false;
}

export async function configure(): Promise<void> {
  // Nothing to configure.
}

export async function loadPackages(): Promise<PurchasesPackage[]> {
  return [];
}

export async function purchase(_pack: PurchasesPackage): Promise<boolean> {
  return false;
}
