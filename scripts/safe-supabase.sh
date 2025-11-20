#!/bin/bash
# Safety wrapper for Supabase commands
# Prevents accidental database resets

COMMAND="$1"

# List of dangerous commands that require confirmation
DANGEROUS_COMMANDS=("db reset" "db push" "link")

# Check if command is dangerous
for dangerous in "${DANGEROUS_COMMANDS[@]}"; do
  if [[ "$*" == *"$dangerous"* ]]; then
    echo "⚠️  WARNING: You are about to run a DESTRUCTIVE command!"
    echo "Command: supabase $*"
    echo ""
    echo "This will:"
    
    case "$dangerous" in
      "db reset")
        echo "  - DELETE ALL DATA in your local database"
        echo "  - Recreate the database from scratch"
        echo "  - Lose all projects, gigs, users, etc."
        ;;
      "db push")
        echo "  - MODIFY YOUR REMOTE DATABASE"
        echo "  - Push local migrations to production"
        echo "  - Potentially break production data"
        ;;
      "link")
        echo "  - Link to a remote Supabase project"
        echo "  - Future commands may affect production"
        ;;
    esac
    
    echo ""
    read -p "Type 'YES I UNDERSTAND' to proceed: " confirmation
    
    if [[ "$confirmation" != "YES I UNDERSTAND" ]]; then
      echo "❌ Command cancelled for safety."
      exit 1
    fi
  fi
done

# Run the actual command
supabase "$@"

