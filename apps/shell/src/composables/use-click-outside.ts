import { onBeforeUnmount, onMounted, type Ref } from 'vue';

/** Gọi callback khi click ngoài element hoặc nhấn Escape. */
export function useClickOutside(
  el: Ref<HTMLElement | null>,
  callback: () => void
) {
  const onClick = (e: MouseEvent) => {
    if (!el.value?.contains(e.target as Node)) callback();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') callback();
  };

  onMounted(() => {
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('mousedown', onClick);
    window.removeEventListener('keydown', onKey);
  });
}
