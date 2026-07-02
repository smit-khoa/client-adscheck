import {
  defineComponent,
  h,
  inject,
  provide,
  ref,
  onMounted,
  type InjectionKey,
  type Ref,
} from "vue";
import { sprite_symbols } from "./sprite-symbols";

const SPRITE_ID = "__mf2_svg_sprite__";
// Symbol.for() resolves through the global registry so every module instance
// (including subpath imports `@mf2/shared-ui/icons` that may not be MF-shared
// as singleton) injects the SAME key. A plain Symbol() would create one key
// per loaded module copy and break inject across shell/remote boundaries.
const SPRITE_KEY: InjectionKey<Ref<boolean>> = Symbol.for("mf2-sprite-ready");

/**
 * Inject sprite SVG vào DOM (1 lần) và cung cấp cờ "ready" cho con cháu.
 * Tương đương SpriteProvider (React Context) bản gốc.
 * Dùng dưới dạng component bao ngoài: <SpriteProvider>...</SpriteProvider>
 */
export const SpriteProvider = defineComponent({
  name: "SpriteProvider",
  setup(_, { slots }) {
    const ready = ref(false);
    provide(SPRITE_KEY, ready);

    onMounted(() => {
      if (typeof document === "undefined") return;
      if (!document.getElementById(SPRITE_ID)) {
        const container = document.createElement("div");
        container.id = SPRITE_ID;
        container.innerHTML = sprite_symbols;
        container.setAttribute("aria-hidden", "true");
        container.style.cssText =
          "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
        document.body.insertBefore(container, document.body.firstChild);
      }
      ready.value = true;
    });

    return () => slots.default?.();
  },
});

export function useSpriteReady(): Ref<boolean> {
  return inject(SPRITE_KEY, ref(false));
}
