# Jira: робочий процес і основи JQL

**Jira** — найпоширеніший трекер задач у IT. Навіть якщо в компанії інший інструмент (YouTrack, Linear, Azure DevOps), ідеї ті самі: типи задач, статуси, дошка, фільтри.

## Типи задач (issue types)

| Тип | Що це | Приклад |
|---|---|---|
| **Epic** | велика частина продукту, яка складається з багатьох задач | «Новий checkout» |
| **Story** | функціональність з погляду користувача | «As a user I want to pay with PayPal…» |
| **Task** | технічна чи організаційна робота | «Налаштувати тестове середовище для оплати» |
| **Bug** | дефект | «Cart: total is not updated…» |
| **Sub-task** | частина story чи task | «Написати тест-кейси для оплати PayPal» |

Зв'язки між задачами: баг може бути **пов'язаний** зі story (relates to), **блокувати** іншу задачу (blocks), бути **дублікатом** (duplicates).

## Дошка і спринт

**Scrum board** показує задачі спринту в колонках за статусами: *To Do → In Progress → In Review → Ready for QA → Done*. Тестувальник бере задачі з колонки «Ready for QA» і переводить їх далі після перевірки.

> [!QA]
> Задача не переходить у Done, поки не виконано **Definition of Done** — зокрема, поки QA не перевірив acceptance criteria. Не бійся повертати задачу назад з коментарем, що саме не так.

## Поля бага в Jira

Summary, Description (кроки, actual, expected), Environment, Priority, Severity (часто кастомне поле), Affects Version, Fix Version, Components, Labels, Assignee, Reporter, Attachments, Linked issues.

## JQL — мова запитів Jira

**JQL (Jira Query Language)** дозволяє знайти потрібні задачі й зберегти фільтр.

```text
project = SHOP AND type = Bug AND status = Open
project = SHOP AND type = Bug AND priority = High ORDER BY created DESC
assignee = currentUser() AND status != Done
type = Bug AND created >= -7d
summary ~ "promo code"
type = Bug AND status in (Open, Reopened)
```

| Елемент | Значення |
|---|---|
| `=` / `!=` | дорівнює / не дорівнює |
| `in (…)` | одне зі значень |
| `~` | містить текст |
| `AND`, `OR` | поєднання умов |
| `ORDER BY … DESC` | сортування (від нових) |
| `currentUser()` | поточний користувач |
| `-7d` | 7 днів тому |

> [!TIP]
> Перед тим як заводити баг, пошукай дублікати: `type = Bug AND summary ~ "promo"`. Це 10 секунд, які економлять команді час.

## Підсумок

- Типи задач: Epic, Story, Task, Bug, Sub-task; задачі пов'язують між собою.
- Дошка показує статуси; QA переводить задачі через «Ready for QA».
- JQL: `field = value`, `AND`/`OR`, `in (…)`, `~` для тексту, `ORDER BY`.
