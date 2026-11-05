import { lazy, ComponentType, LazyExoticComponent } from 'react';

export type ComponentRegistry = {
  [key: string]: LazyExoticComponent<ComponentType<any>>;
};

export const componentRegistry: ComponentRegistry = {
  LegalIntakeChat: lazy(() => import('@/pages/LegalIntakeChat')),
  FAQVoiceAgent: lazy(() => import('@/pages/FAQVoiceAgent')),
  CodeSecurityScanner: lazy(() => import('@/pages/CodeSmellDetector')),
  InvoiceExtractionAgent: lazy(() => import('@/pages/InvoiceExtractionAgent')),
  // Add more components here as needed
  // ExampleComponent: lazy(() => import('@/components/ExampleComponent')),
  // AnotherComponent: lazy(() => import('@/components/AnotherComponent')),
};

export const getComponentByName = (componentName: string): LazyExoticComponent<ComponentType<any>> | null => {
  // Extract component name from JSX-like strings (e.g., "<LegalIntakeChat />" -> "LegalIntakeChat")
  const cleanComponentName = componentName.replace(/[<>/\s]/g, '');
  
  return componentRegistry[cleanComponentName] || null;
};

export const hasComponent = (componentName: string): boolean => {
  const cleanComponentName = componentName.replace(/[<>/\s]/g, '');
  return cleanComponentName in componentRegistry;
};

export const registerComponent = (
  name: string, 
  component: LazyExoticComponent<ComponentType<any>>
): void => {
  componentRegistry[name] = component;
};