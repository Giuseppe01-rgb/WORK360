#!/bin/bash

# Script to fix all controllers - Company ID references
# Replaces req.user.company._id with getCompanyId(req) helper

echo "=== Fixing Controller Company ID References ==="

# List of controllers to fix (excluding already done: auth, site, attendance, analytics)
CONTROLLERS=(
  "userController.js"
  "materialController.js"
  "noteController.js"
  "photoController.js"
  "equipmentController.js"
  "companyController.js"
  "economiaController.js"
  "materialMasterController.js"
  "materialUsageController.js"
  "quoteController.js"
  "salController.js"
  "supplierController.js"
  "workActivityController.js"
)

for controller in "${CONTROLLERS[@]}"; do
  FILE="server/controllers/$controller"
  
  if [[ -f "$FILE" ]]; then
    echo "Processing $controller..."
    
    # Add imports if not present
    if ! grep -q "getCompanyId" "$FILE"; then
      # Add import after first line (after existing imports)
      sed -i '' '1 a\
const { getCompanyId, getUserId } = require('"'"'../utils/sequelizeHelpers'"'"');
' "$FILE"
    fi
    
    # Replace req.user.company._id with getCompanyId(req)
    sed -i '' 's/req\.user\.company\._id || req\.user\.company/getCompanyId(req)/g' "$FILE"
    sed -i '' 's/req\.user\.company\._id/getCompanyId(req)/g' "$FILE"
    
    # Replace req.user._id with getUserId(req) 
    sed -i '' 's/req\.user\._id/getUserId(req)/g' "$FILE"
    
    echo "✅ Fixed $controller"
  else
    echo "⚠️  Skipped $controller (not found)"
  fi
done

echo "=== Done! ==="
