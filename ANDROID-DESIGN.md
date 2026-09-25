# Android design direction — 0.8.0

The primary task is finding a story, then reading comfortably with one hand. The content gets the screen; navigation is a compact floating layer.

The Apple Design skill (`dickwu/apple-design-skill`) informed the review, specifically its Liquid Glass, materials, layout, accessibility, typography, tab-bar, sheet and cross-platform guidance. Apple's visual principles are adapted to Android conventions: 48dp targets, Android Back, Material bottom sheets, system keyboard and system text scaling. No SwiftUI or desktop sidebar logic is used.

## Screen structure

- Launch: selected site `/works`. Header: 发现, site picker, search, page menu. Bottom: 书架 / 发现 / 我的.
- Work list: opaque readable cards; title, author, fandom, ratings/warnings, tags, summary and stats. Original links and filter forms remain functional.
- Reading: a single title row, full-width text, page status, and a glass-inspired action dock for 目录 / 书签 / 排版. Swipe supplements visible page buttons.
- Library: recent reading and bookmarks with position metadata and explicit resume actions. Empty state points to discovery.
- Settings/search/chapters: one dismissible native sheet at a time, scrollable where necessary, keyboard-aware.

## Visual rules

Controls use system sans-serif and a consistent outline icon set. Prose retains user-selected typography. Light surfaces use ink `#1D302D`, secondary text `#556A65` and accent `#216755` on `#F6F8F5`. Night reading coordinates the Android frame with the page. Glass-like gradients, translucent fills, highlights and elevation are limited to navigation; reading text and cards stay opaque. This is an Android approximation, not Apple's runtime Liquid Glass implementation.

Do not reintroduce an address bar, the desktop shelf rail, repeated website masthead, or floating reading-switch overlay. Keep original-site mode reachable through the page menu.
