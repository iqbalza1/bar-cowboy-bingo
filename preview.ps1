# Read-only UI screenshot preview with sample data; not the production server.
$root = Join-Path $PSScriptRoot 'public'
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add('http://localhost:3188/')
$listener.Start()
Write-Output 'Screenshot preview at http://localhost:3188'
try {
 while ($listener.IsListening) {
  $context=$listener.GetContext()
  $route=$context.Request.Url.AbsolutePath
  $contentType='application/json'
  switch ($route) {
   '/api/state' {$content='{"id":"preview","draws":[6,27,41,49,61,3,24,31,51,65,12,18,39,53,68,5,30,35,57,75,13,28,34,48,73],"stage":0,"paused":false,"winners":[],"updatedAt":"preview"}'}
   '/api/session' {$content='{"authenticated":true}'}
   '/app.js' {$content=[IO.File]::ReadAllText((Join-Path $root 'app.js'));$contentType='text/javascript'}
   '/style.css' {$content=[IO.File]::ReadAllText((Join-Path $root 'style.css'));$contentType='text/css'}
   default {$content=[IO.File]::ReadAllText((Join-Path $root 'index.html'));$contentType='text/html'}
  }
  $bytes=[Text.Encoding]::UTF8.GetBytes($content)
  $context.Response.ContentType=$contentType+'; charset=utf-8'
  $context.Response.ContentLength64=$bytes.Length
  $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
  $context.Response.Close()
 }
} finally {$listener.Stop()}
