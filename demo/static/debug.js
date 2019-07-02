const area = document.getElementById('debug');

export function debug(text) {
  area.value += `${text}\n\n`;
}
export function clear() {
  area.value = '';
}