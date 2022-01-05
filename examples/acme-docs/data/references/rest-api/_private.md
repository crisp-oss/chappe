TYPE: API Blueprint
TITLE: REST API Reference (Private)
UPDATED: 2021-11-03
FORMAT: 1A
HOST: https://api.acme.com/v1

# Reference

This reference documents private Acme API routes.

☢️ **Those routes are solely used by Acme systems to perform eg. account management and other tasks. This may not be shared to public users, although routes are still available for them to access through the same API endpoint than the public one.**

# Group Email

Manages Acme emails.

## Subscription [/email/{email_hash}/subscription]

Manages email subscriptions. Used to subscribe or unsubscribe from Acme notification emails.

### Get Subscription Status [GET /email/{email_hash}/subscription/{key}{?team_id}]

Resolves current subscription status (subscribed or unsubscribed).

+ Attributes
    + error (boolean)
    + reason (string)
    + data (object)
        + subscribed (boolean) - Whether email is subscribed or not

+ Parameters
    + email_hash (string) - Email secure hash
    + key (string) - Private security for given email
    + team_id (string, optional) - Team identifier for email

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
