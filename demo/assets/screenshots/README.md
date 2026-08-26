# Screenshots

Captured against production (1280×800, checked via `/api/v1/health` git_sha). To regenerate:

```bash
# from product-graph-web-ui repo (already has playwright 1.61)
NODE_PATH=./node_modules npx playwright screenshot https://dash.asktea.ai/ar/login demo/assets/screenshots/dash-login.png
NODE_PATH=./node_modules npx playwright screenshot https://app.asktea.ai/ar demo/assets/screenshots/app-home.png
```

Two initial captures are included in this commit; additional role-specific captures (seller products, admin tiles, mobile) can be added via the prototype demo script.
