1. on home page->featured products: all prodcuts has "new" tag: remove it
2. in products section-> categories: each product has "new" tag: remove it and keep only one product or category with "new" tag.

3. products: double metric are shon "kg kg", "in in" for every spec
4. products: double metric are shon "mm mm" for every spec
5. products->categories(like"skid steer tires")->new: in skid steer tires "new" and "featured"are categories not filters: so reset button should not come after clicking new: when we apply filter like sort A-Z, newest first: then reser button should come and reset these filters (not "new" and "featured")

6. products: fields missing "no data in key features,applications,compatible equipment"

7. products: rating stars not matching the rating : make random rating from 3.5 to 5 starts for all products and match the visual stars according to the actual rating of the product
8. when every sign in pop up comes: sign in pop up should dissapear after we slide it left and right( right now we can only slide it down).

9. C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\index.js:295:15
GET /api/v1/activity?page=1&pageSize=50 500 1.494 ms - 129
("ocument_id" IN ($1,$2,$3) OFFSET $4
prisma:query SELECT "public"."translations"."id", "public"."translations"."entity_type", "public"."translations"."entity_id", "public"."translations"."field", "public"."translations"."language_code", "public"."translations"."value" FROM "public"."translations" WHERE ("public"."translations"."entity_type" IN ($1,$2) AND "public"."translations"."entity_id" IN ($3,$4,$5) AND "public"."translations"."field" = $6) OFFSET $7
GET /api/v1/business/dealer/documents 200 15.274 ms - 1231
[ERROR] 2026-10-18T03:11:48.483Z Unhandled error: TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
    at C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\src\modules\activity\activity.validation.js:90:17
    at Layer.handleRequest (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\layer.js:152:17)
    at next (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\route.js:157:13)
    at authGuard (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\src\core\middleware\authGuard.js:70:5)
    at Layer.handleRequest (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\layer.js:152:17)
    at next (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\route.js:117:3)
    at handle (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\index.js:435:11)
    at Layer.handleRequest (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\layer.js:152:17)
    at C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\index.js:295:15
GET /api/v1/activity?page=1&pageSize=50 500 1.710 ms - 129
[ERROR] 2026-10-18T03:11:50.264Z Unhandled error: TypeError: Cannot set property query of #<IncomingMessage> which has only a getter
    at C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\src\modules\activity\activity.validation.js:90:17
    at Layer.handleRequest (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\layer.js:152:17)
    at next (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\route.js:157:13)
    at authGuard (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\src\core\middleware\authGuard.js:70:5)
    at Layer.handleRequest (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\layer.js:152:17)
    at next (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\route.js:157:13)
    at Route.dispatch (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\route.js:117:3)
    at handle (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\index.js:435:11)
    at Layer.handleRequest (C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\lib\layer.js:152:17)
    at C:\college\3rd YEAR_SEM-5\RPG\Camso_mobile_app\node_modules\router\index.js:295:15
GET /api/v1/activity?page=1&pageSize=50 500 1.494 ms - 129
")
10. after bookmarks are added they are not synced to to account and "no bookmarks yet" is shown

11. oem account/role->oem partner portal :invalid business access token
ic"."business_users"."organization_id" IN ($1) OFFSET $2
GET /api/v1/business/organization 304 10.453 ms - -
POST /api/v1/bookmarks/sync 401 0.887 ms - 120
POST /api/v1/bookmarks/sync 401 0.692 ms - 120
GET /api/v1/business/oem/documents 401 0.734 ms - 129
GET /api/v1/business/oem/documents 401 0.566 ms - 129
GET /api/v1/business/oem/documents 401 0.462 ms - 129


12. support-> document library: when click on download a pop up comes that document is downloaded but its actually not and no way to see the docuemnt
13. support-> document library->document(like 'admin created manual'): after we open a document and click the big download butoon we get "invalid access token".

GET /api/v1/categories 304 3.130 ms - -
POST /api/v1/devices 401 0.304 ms - 120
POST /api/v1/bookmarks 401 0.355 ms - 120
GET /api/v1/documents/cmvcdl5zs0000uldkh0tt15f3/download 401 0.458 ms - 120
GET /api/v1/documents/cmvcdl5zs0000uldkh0tt15f3/download 401 1.405 ms - 120
GET /api/v1/documents/cmvcdl5zs0000uldkh0tt15f3/download 401 1.047 ms - 120
GET /api/v1/documents/cmvccmfdk0000ulhcrohri8wl/download 401 0.526 ms - 120

14. a. in previous version of app: there were 14 documents including all role specific documents: now we have only 3
b. we can show all 14 documents but never show admin only documents to everyone. the admin specific things should be shown only to admin

15. calculator: signed in as a dealer and after clicking on "save results to account":pop up comes "Failed to save calculation. Authentication required to save calculation."
GET /api/v1/testimonials?page=1&pageSize=50 304 8.190 ms - -
GET /api/v1/calculations?page=1&pageSize=50 401 0.937 ms - 120
POST /api/v1/calculations 401 0.418 ms - 120


16. profile->account activity & saved calculations: cannot see the given feedback, viewd products, downloaded documents etc..(bookmark, searched). same for distributor(signed in as distributor).