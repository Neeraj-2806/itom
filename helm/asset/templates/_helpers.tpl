{{- define "asset-service.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/* create fullname */}}
{{- define "asset-service.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end }}

{{/* Chart label */}}
{{- define "asset-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end }}

{{/* Labels for asset-service */}}
{{- define "asset-service.labels" -}}
helm.sh/chart: {{ include "asset-service.chart" . }}
app.kubernetes.io/name: {{ include "asset-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/* Selector labels for asset-service */}}
{{- define "asset-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "asset-service.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/* service account for asset */}}
{{- define "asset-service.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "asset-service.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end }}
