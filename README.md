# Pathfinding Visualizer

Interactive grid-based pathfinding visualizer showcasing A*, Dijkstra, BFS, and DFS with real-time animations.

## Demo
- GitHub Pages (after pushing main): http://127.0.0.1:3000/index.html?serverWindowId=ffb0fb39-8a35-4beb-a339-27566a6e708a
  - Ensure the repo name matches the path or adjust the URL accordingly.

## Publish to GitHub
1) Create a new GitHub repo and push this folder (contains only static assets).
2) Enable GitHub Pages for the repo (Settings → Pages → Source: `main` branch, `/root`).
3) Wait for Pages to build, then open the demo link above.

## Run locally
Open `index.html` in any modern browser (no build step required).

## Controls
- Choose an algorithm from the dropdown.
- Click cells to toggle walls. Shift+Click to set the Start node, Alt/⌘+Click to set the Goal node.
- Press **Run** to animate the search. Speed slider controls the delay per step (ms).
- **Clear Visited** keeps walls/start/goal but removes exploration traces. **Reset Grid** clears everything. **Random Walls** seeds obstacles.
