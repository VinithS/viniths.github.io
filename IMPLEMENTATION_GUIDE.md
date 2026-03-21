# Retro Personal Website: Implementation Guide

Welcome to the implementation guide for your retro-themed personal website! This document will serve as your step-by-step roadmap to building the site from scratch while learning new technologies.

## Technology Stack

Based on your goals (lean stack, learning, simple personal website with blog/photos), here is the chosen stack:

1. **Frontend Framework: Astro**
   - **What it is:** A modern web framework designed for content-driven websites (like blogs and portfolios).
   - **Why we need it:** It allows you to write content in Markdown (`.md`) easily. By default, it ships *zero* JavaScript to the browser, making your site incredibly fast. It also uses intuitive file-based routing.
2. **Interactive Components (Optional/Later): Svelte**
   - **What it is:** A tool for building highly interactive web user interfaces.
   - **Why we need it:** While Astro handles the static content, you can easily plug Svelte into Astro (via "Islands architecture") for interactive parts like your "loading screen" or specific retro widgets.
3. **Styling: Vanilla CSS**
   - **Why we need it:** To achieve a highly customized Windows XP and retro handheld aesthetic, we will write our own CSS using modern features like CSS Variables (Custom Properties) to define the color palette and typography.
4. **Backend (Optional/Later): Go or Rust**
   - *Note:* For a simple blog/photo album, a backend isn't strictly necessary since Astro generates the HTML from Markdown. However, if you want to add a dynamic feature later (like a guestbook or view counter), we can spin up a lean microservice in Go or Rust.

## The Learning Journey: Step-by-Step

### Step 1: Workspace Setup (WSL / Environment)
Before coding, we need the right tools.
- **Node.js**: Astro and Svelte require Node.js to run the local development server and build the site.
- **Git**: For version control (already installed).
- *Action:* See the `README.md` for instructions on installing Node.js via `nvm` (Node Version Manager).

### Step 2: Bootstrapping the Astro Project
Once Node.js is installed, we will use a command-line tool to generate the boilerplate code for our Astro site.
- *Concept:* "Bootstrapping" means setting up the initial folder structure and configuration files automatically so you don't have to write them from scratch.
- *Action:* We will run `npm create astro@latest ./` (when ready) to initialize the site in this repository.

### Step 3: Global Styling and Retro Theme
We will create a global CSS file (`src/styles/global.css`) to define our retro aesthetics.
- *Concept:* **CSS Variables**. We will define colors like `--xp-blue: #0058e6;` so we can reuse them across the entire site consistently.
- *Action:* Set up fonts (like MS Sans Serif or a pixel font), background colors, and basic box styling to mimic classic window borders.

### Step 4: Layouts and Pages
Astro uses `.astro` files.
- *Concept:* **Layouts**. A Layout is a wrapper component (containing the `<head>`, navbar, and footer) that you can reuse across all your pages to ensure a consistent look.
- *Concept:* **Routing**. Any `.astro` or `.md` file placed in the `src/pages/` directory automatically becomes a route on your website (e.g., `src/pages/about.astro` becomes `yoursite.com/about`).

### Step 5: Content Collections (Blog & Photos)
We will set up Astro "Content Collections".
- *Concept:* Content Collections allow you to write your blog posts and photo metadata in Markdown/MDX, and Astro will automatically validate the frontmatter (title, date, tags) and build the pages.

### Step 6: Interactive Widgets (Svelte)
Once the static site is up, we can integrate Svelte for the fun stuff.
- *Action:* Create a `<LoadingScreen client:load />` Svelte component to show a retro boot-up sequence when users first visit the site.
