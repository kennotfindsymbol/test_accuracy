## Quick Start

1. **Clone the repository and enter the directory:**
```
git clone https://github.com/kennotfindsymbol/test_accuracy
cd <repository-folder>
```

2. **Install dependencies:**

```
npm i
```

3. **Place your images:**

- **Images expected to be NSFW (should be "PENDING"):**
  - Put these in `images/pendinglist/`
- **Images expected to be safe (should be "SAFE"):**
  - Put these in `images/safelist/`

> **Note:**  
> Git will ignore all files except `example.jpg` in these directories (see `.gitignore`).

4. **Run the classifier:**
- **With default settings (threshold 0.9, no table output):**
  ```
  node app.js
  ```
- **With threshold and detailed output:**
  ```
  node app.js -t 0.85 -l
  # or
  node app.js --threshold 0.85 --long
  ```
- **With only threshold or only detailed output:**
  ```
  node app.js -t 0.8
  node app.js -l
  ```

## Output

- **Console:** Shows how many images were correctly classified in each directory.
- **CSV:** Writes misclassified images to `misclassified_images.csv` with details.

