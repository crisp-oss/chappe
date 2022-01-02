TYPE: API Blueprint
TITLE: REST API Reference (Private)
UPDATED: 2021-11-03
FORMAT: 1A
HOST: https://api.crisp.chat/v1

# Reference

This reference documents private Crisp API routes.

☢️ **Those routes are solely used by Crisp apps to perform eg. account management and other tasks. This may not be shared to public users, although routes are still available for them to access through the same API endpoint than the public one.**

# Group Email

Manages Crisp emails.

## Subscription [/email/{email_hash}/subscription]

Manages email subscriptions. Used to subscribe or unsubscribe from Crisp notification emails.

### Get Subscription Status [GET /email/{email_hash}/subscription/{key}{?website_id}]

Resolves current subscription status (subscribed or unsubscribed).

+ Attributes
    + error (boolean)
    + reason (string)
    + data (object)
        + subscribed (boolean) - Whether email is subscribed or not

+ Parameters
    + email_hash (string) - Email secure hash
    + key (string) - Private security for given email
    + website_id (string, optional) - Website identifier for email

+ Request Get Subscription Status (application/json)

    + Body

+ Response 200 (application/json)

    + Body

        ```
        {
            "error": false,
            "reason": "resolved",

            "data": {
                "subscribed": true
            }
        }
        ```

+ Response 404 (application/json)

    + Body

        ```
        {
            "error": true,
            "reason": "email_not_found",
            "data": {}
        }
        ```
