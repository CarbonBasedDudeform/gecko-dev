/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_SelectableProfileLifecycle() {
  startProfileService();
  const SelectableProfileService = getSelectableProfileService();

  Services.prefs.setBoolPref("browser.profiles.enabled", false);
  await SelectableProfileService.init();
  Assert.ok(
    !SelectableProfileService.isEnabled,
    "Service should not be enabled"
  );

  Services.prefs.setBoolPref("browser.profiles.enabled", true);
  await SelectableProfileService.init();
  Assert.ok(
    SelectableProfileService.isEnabled,
    "Service should now be enabled"
  );

  let profiles = await SelectableProfileService.getAllProfiles();

  Assert.ok(!profiles.length, "No selectable profiles exist yet");

  await SelectableProfileService.maybeSetupDataStore();
  let currentProfile = SelectableProfileService.currentProfile;

  const leafName = (await currentProfile.rootDir).leafName;

  const profilePath = PathUtils.join(
    Services.dirsvc.get("DefProfRt", Ci.nsIFile).path,
    leafName
  );

  let profileDirExists = await IOUtils.exists(profilePath);
  const profileLocalPath = PathUtils.join(
    Services.dirsvc.get("DefProfLRt", Ci.nsIFile).path,
    leafName
  );
  let profileLocalDirExists = await IOUtils.exists(profileLocalPath);

  Assert.ok(
    profileDirExists,
    `Profile dir was successfully created at ${profilePath}`
  );
  Assert.ok(
    profileLocalDirExists,
    `Profile local dir was successfully created at ${profileLocalPath}`
  );

  profiles = await SelectableProfileService.getAllProfiles();

  Assert.equal(profiles.length, 1, "One selectable profile exists");

  let selectableProfile = profiles[0];

  let profile = await SelectableProfileService.getProfile(selectableProfile.id);

  for (let attr of ["id", "name", "path"]) {
    Assert.equal(
      profile[attr],
      currentProfile[attr],
      `We got the correct profile ${attr}`
    );

    Assert.equal(
      selectableProfile[attr],
      currentProfile[attr],
      `We got the correct profile ${attr}`
    );
  }

  selectableProfile.name = "updatedTestProfile";

  await SelectableProfileService.updateProfile(selectableProfile);

  profile = await SelectableProfileService.getProfile(selectableProfile.id);

  Assert.equal(
    profile.name,
    "updatedTestProfile",
    "We got the correct profile name: updatedTestProfile"
  );

  let newProfile = await createTestProfile({ name: "New profile" });
  let rootDir = await newProfile.rootDir;
  let localDir = PathUtils.join(
    Services.dirsvc.get("DefProfLRt", Ci.nsIFile).path,
    rootDir.leafName
  );

  profileDirExists = await IOUtils.exists(rootDir.path);
  profileLocalDirExists = await IOUtils.exists(localDir);
  Assert.ok(profileDirExists, "Profile dir was successfully created");
  Assert.ok(
    profileLocalDirExists,
    "Profile local dir was successfully created"
  );

  profiles = await SelectableProfileService.getAllProfiles();
  Assert.equal(profiles.length, 2, "Should now be two profiles.");

  await SelectableProfileService.deleteProfile(newProfile);

  profiles = await SelectableProfileService.getAllProfiles();
  Assert.equal(profiles.length, 1, "Should now be one profiles.");

  profileDirExists = await IOUtils.exists(rootDir.path);
  profileLocalDirExists = await IOUtils.exists(localDir);
  Assert.ok(!profileDirExists, "Profile dir was successfully removed");
  Assert.ok(
    !profileLocalDirExists,
    "Profile local dir was successfully removed"
  );
});
