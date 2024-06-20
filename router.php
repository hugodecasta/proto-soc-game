<?php

$requestedPath = $_SERVER['REQUEST_URI'];
$excludedPaths = [
    '/.git',
];

foreach ($excludedPaths as $path) {
    if (strpos($requestedPath, $path) === 0) {
        header('HTTP/1.0 404 Not Found');
        echo "Not Found";
        return;
    }
}

return false;