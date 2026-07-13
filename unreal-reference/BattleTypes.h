#pragma once

#include "CoreMinimal.h"
#include "BattleTypes.generated.h"

UENUM(BlueprintType)
enum class EBattlePhase : uint8
{
    Menu,
    Deployment,
    Combat,
    GameOver
};

UENUM(BlueprintType)
enum class EBattleMorale : uint8
{
    Steady,
    Shaken,
    Routed
};

UENUM(BlueprintType)
enum class EBattleArc : uint8
{
    Front,
    Flank,
    Rear
};

UENUM(BlueprintType)
enum class EBattleSupply : uint8
{
    Normal,
    Low,
    Critical
};

USTRUCT(BlueprintType)
struct FBattleHex
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Column = 0;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Row = 0;

    bool operator==(const FBattleHex& Other) const
    {
        return Column == Other.Column && Row == Other.Row;
    }
};

USTRUCT(BlueprintType)
struct FBattleFireRequest
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 AttackerStrength = 4;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EBattleMorale AttackerMorale = EBattleMorale::Steady;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EBattleArc IncomingArc = EBattleArc::Front;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EBattleSupply AttackerSupply = EBattleSupply::Normal;
};

USTRUCT(BlueprintType)
struct FBattleFireResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    TArray<int32> Rolls;

    UPROPERTY(BlueprintReadOnly)
    int32 TargetNumber = 5;

    UPROPERTY(BlueprintReadOnly)
    int32 Hits = 0;
};

USTRUCT(BlueprintType)
struct FBattleMoraleRequest
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bSteadyFriendAdjacent = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bInCommand = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bHitFromFlankOrRear = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    EBattleSupply Supply = EBattleSupply::Normal;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    bool bFlagshipLost = false;
};

USTRUCT(BlueprintType)
struct FBattleMoraleResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    int32 Roll = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 Modifier = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 Total = 0;

    UPROPERTY(BlueprintReadOnly)
    bool bPassed = false;
};
