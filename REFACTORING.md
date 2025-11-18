# Рефакторинг - CSS Highlights API

## Что изменилось

**Старый подход** (DOM-based):
- Создание `<mark>` элементов
- Замена текстовых узлов через `replaceChild()`
- Ручная очистка через восстановление текстовых узлов
- Инвалидация кэша после каждого изменения
- 370 строк кода

**Новый подход** (CSS-based):
- Использование CSS Highlights API
- Создание `Range` объектов без изменения DOM
- Очистка через `CSS.highlights.delete()`
- Кэш сохраняется между подсветками
- 292 строк кода (-21%)

## Преимущества

1. **Нет DOM мутаций**
   - Решает Bug #9 (конфликты с React/Vue)
   - Не требует `normalize()` после highlight
   - Не ломает page layout

2. **Лучшая производительность**
   - Range API быстрее чем DOM manipulation
   - Кэш nodeMap работает дольше
   - Меньше reflow/repaint

3. **Проще код**
   - Убрано: createElement, replaceChild, DocumentFragment, cacheValid
   - Добавлено: createRanges, CSS.highlights
   - Минус 78 строк

4. **Декларативный CSS**
   ```css
   ::highlight(tts-current) {
     background-color: rgba(102, 126, 234, 0.3);
     color: inherit;
   }
   ```

## Совместимость

CSS Highlights API поддерживается в:
- Chrome 105+
- Edge 105+
- Safari 17.2+
- Firefox (в разработке)

Для старых браузеров нужен fallback на DOM-based approach.

## Итоги фиксов

✅ **Все критические баги исправлены**:
- Bug #1, #2: Memory leaks (offscreen.js)
- Bug #3, #14: False LRU cache
- Bug #4: Prefetch race condition
- Bug #5: Navigation race
- Bug #6: Highlighting length calculation
- Bug #7: Prefetch abort
- Bug #8: TreeWalker cache
- Bug #9: **DOM conflicts (решено рефакторингом)**
- Bug #10: Text node fragmentation
- Bug #12: Scroll jank
- Bug #13: Silent errors
- Bug #15: Bounds check

**Тесты**: 31/31 ✅
