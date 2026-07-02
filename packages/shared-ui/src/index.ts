// Core remote/loading components
export { default as RemoteErrorBoundary } from "./components/RemoteErrorBoundary.vue";
export { default as RemoteLoadingFallback } from "./components/RemoteLoadingFallback.vue";
export { default as SmitLogo } from "./components/SmitLogo.vue";
export { default as SmitLoading } from "./components/SmitLoading.vue";

// shadcn-vue components (reka-ui based) — added via shadcn-vue CLI
export * from "./components/ui/button";
export * from "./components/ui/card";
export * from "./components/ui/input";
export * from "./components/ui/label";
export * from "./components/ui/badge";
export * from "./components/ui/separator";
export * from "./components/ui/select";
export * from "./components/ui/checkbox";
export * from "./components/ui/radio-group";
export * from "./components/ui/switch";
export * from "./components/ui/textarea";
export * from "./components/ui/form";
export * from "./components/ui/dialog";
export * from "./components/ui/drawer";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/popover";
export * from "./components/ui/date-range-picker";
export * from "./components/ui/tooltip";
export * from "./components/ui/sonner";
export * from "./components/ui/tabs";
export * from "./components/ui/table";
export * from "./components/ui/workspace-path-frame";
export * from "./components/ui/skeleton";
export * from "./components/ui/resizable";
export * from "./components/ui/avatar";
export * from "./components/ui/pagination";

// Utilities
export { cn } from "./lib/utils";
export { colors } from "./lib/colors";
export type { ColorToken } from "./lib/colors";

// Icons + sprite provider
export { SpriteProvider, useSpriteReady, Icon, ICON_NAMES } from "./icons";
export type { IconName } from "./icons";
