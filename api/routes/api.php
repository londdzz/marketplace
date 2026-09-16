<?php

declare(strict_types=1);

/*
 * Routes are registered under the /api/v1 prefix, configured in bootstrap/app.php.
 *
 * The endpoints themselves arrive with their phases: authentication in phase 2,
 * listings and photos in phase 3, publishing and credits in phase 4, search in
 * phase 5, and messaging, favorites, saved searches and reports in phase 6.
 */
