@echo off
REM Push all AI artifact JSON packages to SharePoint Online
echo ==========================================================
echo  Engineering Commons - Push Artifact JSONs to SharePoint
echo ==========================================================

python scripts\push_artifacts_json_to_sharepoint.py %*
