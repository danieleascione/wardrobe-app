@milestone_7 @gdpr
Feature: GDPR compliance and user data rights
  As a PocketWardrobe user in the European Union
  I want my personal data to be handled lawfully, transparently, and under my control
  So that I can use the app confidently knowing my privacy is respected

  # GDPR business rules from requirements.md Section 4 and component-boundaries.md Section 8
  # Driving ports: ItemDigitizationPort (consent), WardrobeQueryPort (data access)
  # No dedicated GDPR port — compliance is enforced through existing ports and domain rules
  # Consent logging: ConsentLogPort (outbound), retained 3 years, NOT deleted on account delete

  @smoke
  Scenario: Sofia must explicitly grant photo storage consent before her first upload
    Given Sofia has completed style calibration
    And she has not yet granted photo storage consent
    When she attempts to capture her first garment photo
    Then she sees a clear explanation of how her photos will be stored and used
    And two options are shown: "I agree" and "Not now"
    And the upload does not proceed until she taps "I agree"
    When she taps "I agree"
    Then her consent is recorded with today's date and the current privacy policy version
    And she is taken to the item capture screen to photograph her first item

  @smoke
  Scenario: Sofia deletes her account and all her personal data is removed within 30 seconds
    Given Sofia has a PocketWardrobe account with:
      | 23 wardrobe items with photos |
      | 14 accepted wear events       |
      | a completed style profile     |
    When she requests account deletion from Settings
    Then within 30 seconds all her wardrobe items are deleted
    And all her wear events are deleted
    And her style profile is deleted
    And her garment photos are deleted from storage
    And she receives confirmation that her account has been deleted

  @smoke
  Scenario: Garment photos do not retain location data after upload
    Given Sofia is photographing her camel coat
    And the original photo contains GPS coordinates in its metadata
    When she captures the photo and it is processed
    Then the version stored in the app contains no GPS coordinates
    And no location metadata from the original photo is retained

  @edge-case
  Scenario: Consent log is retained after Sofia deletes her account
    Given Sofia has granted photo storage consent
    And her consent has been recorded with a timestamp and policy version
    When she deletes her account
    Then her consent record is retained in the compliance log
    And the consent record is not accessible to her account or any personal data query
    And the record is retained for the legally required period

  @edge-case
  Scenario: Sofia revokes photo storage consent from Settings
    Given Sofia has previously granted photo storage consent
    When she navigates to Settings and revokes her consent
    Then her revocation is recorded with today's date and the current policy version
    And she is informed that her existing photos remain in her wardrobe until she deletes them
    And no new photos can be uploaded until consent is re-granted

  @pending
  @edge-case
  Scenario: Sofia re-grants consent after having revoked it
    Given Sofia previously revoked her photo storage consent
    When she navigates to Settings and grants consent again
    Then her new consent is recorded with today's date and the current policy version
    And she can immediately photograph and upload new garment items

  @pending
  @edge-case
  Scenario: Sofia can see that photo capture guidance is available before photographing
    Given Sofia is on the item capture screen for the first time
    Then in-app guidance on flat-lay or hanging photo methods is shown
    And a help icon is visible on the capture screen for subsequent captures

  @pending
  @error-path
  Scenario: Account deletion is requested but the process takes longer than expected
    Given Sofia has requested account deletion
    And the deletion process encounters a delay beyond 30 seconds
    Then Sofia is informed that deletion is in progress
    And she receives confirmation once all data has been successfully removed
    And her account is inaccessible during the deletion process

  @pending
  @error-path
  Scenario: Upload is blocked when no valid photo storage consent exists
    Given Sofia has not granted or has revoked photo storage consent
    When she attempts to upload a garment photo
    Then the upload is blocked
    And she sees "To add photos, please grant storage consent in Settings"
    And a link to the consent settings is shown

  @pending
  @property
  Scenario: Photo location metadata is never retained for any uploaded garment
    Given any garment photo is uploaded by any user
    When the photo is stored in the wardrobe
    Then the stored image contains no GPS coordinates, device identifiers, or capture timestamps from the original
