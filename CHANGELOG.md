# 0.2.5

- Fix "phantom comments" issue. The sourceFile's comments were intermingling 
with optimized-record output causing runtime exceptions in some cases. It's
suspected to be an issue

# 0.2.4

- Expose `transform: (jsSource: string) => string` JS API. Useful for build 
toolchains.
