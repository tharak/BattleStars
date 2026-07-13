#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "BattleTypes.h"
#include "BattleRulesSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FBattleShotResolved, const FBattleFireResult&, Result);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FBattleMoraleResolved, const FBattleMoraleResult&, Result);

// Copy into Source/BattleStars and replace BATTLESTARS_API if the module name
// differs. The authoritative GameMode should own the seed and call this only
// on the server.
UCLASS()
class BATTLESTARS_API UBattleRulesSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    UPROPERTY(BlueprintAssignable)
    FBattleShotResolved OnShotResolved;

    UPROPERTY(BlueprintAssignable)
    FBattleMoraleResolved OnMoraleResolved;

    UFUNCTION(BlueprintCallable, Category = "Battle|Rules")
    void InitializeSeed(int32 Seed);

    UFUNCTION(BlueprintCallable, Category = "Battle|Rules")
    FBattleFireResult ResolveFire(const FBattleFireRequest& Request);

    UFUNCTION(BlueprintCallable, Category = "Battle|Rules")
    FBattleMoraleResult ResolveMorale(const FBattleMoraleRequest& Request);

private:
    FRandomStream RandomStream;
};
