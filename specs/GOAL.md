# Goal

Build a small web application that lets a user log in and view the full organizational hierarchy of users as a tree.

Specified in `../docs/task.md`.

## Core flow

- Opening the app shows a login page.
- A successful login redirects to the hierarchy page.
- The hierarchy page loads the users and renders them as a tree.

## Hierarchy tree

- The tree reflects who reports to whom: each user reports to their manager.
- Users without a manager are roots, so the tree may have several roots.
- A user has at most one manager.
- The full tree is always shown, regardless of who is logged in.

Each user is presented with:

- A badge showing the user's photo, or their initials when no photo is available.
- The user's full name.
- The user's email.

Expand/collapse:

- A user is a manager if at least one other user reports to them.
- Managers show a "+" to the left of their badge; clicking it collapses or expands the branch beneath them.
- Non-managers show a "-" in that position.

## Header

The logged-in user's name appears in the top right corner of the hierarchy page, next to a logout link that signs the user out and returns to the login page.
