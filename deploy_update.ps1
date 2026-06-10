# common variables, change as required
$RESOURCE_GROUP = "rg-cwm-mcp"
$ACR_NAME = "acrcwmmcp"
$ACR_LOGIN_SERVER = "$ACR_NAME.azurecr.io"
$ACA_APP_NAME = "connectwwise-manage-mcp"

# pull latest changes from this fork
git pull

# rebuild in ACR
az acr build --registry $ACR_NAME --image connectwise-manage-mcp:latest

# deploy the new image to ACR
az containerapp update --name $ACA_APP_NAME --resource-group $RESOURCE_GROUP --image "$ACR_LOGIN_SERVER/connectwise-manage-mcp:latest"
